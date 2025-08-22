import csv
from datetime import datetime
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.gsc_data import GSCData
from app.models.page import Page
from app.db.session import get_db

class SQLiteGSCRepository:
    def __init__(self, db: Session):
        self.db = db

    async def import_gsc_csv(
        self, 
        project_id: int, 
        csv_path: str,
        period_start: Optional[str] = None,
        period_end: Optional[str] = None
    ) -> Dict[str, Any]:
        """Import GSC CSV data and match with existing pages"""
        
        # Parse period dates if provided
        period_start_dt = None
        period_end_dt = None
        if period_start:
            try:
                period_start_dt = datetime.fromisoformat(period_start.replace('Z', '+00:00'))
            except:
                pass
        if period_end:
            try:
                period_end_dt = datetime.fromisoformat(period_end.replace('Z', '+00:00'))
            except:
                pass
        
        # Read and validate CSV using standard library
        # Try different delimiters (comma, tab, semicolon)
        rows = []
        for delimiter in [',', '\t', ';']:
            try:
                with open(csv_path, 'r', encoding='utf-8') as file:
                    reader = csv.DictReader(file, delimiter=delimiter)
                    test_rows = list(reader)
                    
                    # Check if we have multiple columns (not just one long column name)
                    if len(test_rows) > 0 and len(test_rows[0].keys()) > 1:
                        rows = test_rows
                        print(f"Successfully parsed CSV with delimiter: '{delimiter}'")
                        break
            except Exception as e:
                continue
        
        if not rows:
            raise ValueError(f"Failed to read CSV file with any delimiter (, \\t ;)")
        
        if not rows:
            raise ValueError("CSV file is empty")
        
        # Map different possible column names to our standard names
        column_mapping = {
            # Standard English names
            'Page': 'Page',
            'URL': 'Page', 
            'Impressions': 'Impressions',
            'Clicks': 'Clicks',
            'CTR': 'CTR',
            'Position': 'Position',
            'Average position': 'Position',
            'Avg. Position': 'Position',
            # French names (common in French GSC exports)
            'Page de destination finale': 'Page',
            'URL de la page': 'Page',
            'Pages': 'Page',
            'Impressions': 'Impressions',
            'Clics': 'Clicks',
            'Taux de clic (CTR)': 'CTR',
            'CTR moyen': 'CTR',
            'Position moyenne': 'Position',
            'Pos. moy.': 'Position'
        }
        
        first_row = rows[0]
        available_columns = list(first_row.keys())
        print(f"Available columns in CSV: {available_columns}")
        
        # Clean column names (remove extra spaces, tabs, etc.)
        cleaned_available_columns = [col.strip() for col in available_columns]
        print(f"Cleaned available columns: {cleaned_available_columns}")
        
        # Find the actual column names in the CSV
        mapped_columns = {}
        for i, csv_col in enumerate(available_columns):
            cleaned_col = csv_col.strip()
            if cleaned_col in column_mapping:
                mapped_columns[column_mapping[cleaned_col]] = csv_col
                print(f"Mapped: '{cleaned_col}' -> '{column_mapping[cleaned_col]}' (original: '{csv_col}')")
        
        print(f"Mapped columns: {mapped_columns}")
        
        # Check if we have all required columns
        required_columns = ['Page', 'Impressions', 'Clicks', 'CTR', 'Position']
        missing_columns = [col for col in required_columns if col not in mapped_columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}. Available: {', '.join(available_columns)}")
        
        # Clean and normalize data using mapped columns
        # First pass: collect and consolidate URLs with anchors (#)
        url_consolidation = {}  # base_url -> aggregated metrics
        
        for row in rows:
            page_col = mapped_columns['Page']
            if not row.get(page_col) or row[page_col].strip() == '':
                continue  # Skip rows without URL
            
            try:
                # Helper function to parse French numbers
                def parse_french_number(value, is_percentage=False):
                    if not value or value == '':
                        return 0.0
                    
                    # Convert to string and clean
                    str_value = str(value).strip()
                    
                    # Handle percentages
                    if is_percentage or str_value.endswith('%'):
                        str_value = str_value.replace('%', '').strip()
                        is_percentage = True
                    
                    # Replace French decimal separator (comma) with dot
                    str_value = str_value.replace(',', '.')
                    
                    # Remove space thousands separators
                    str_value = str_value.replace(' ', '')
                    
                    # Convert to float
                    result = float(str_value)
                    
                    # If it was a percentage, convert to decimal
                    if is_percentage:
                        result = result / 100.0
                        
                    return result
                
                # Parse the current row
                original_url = row[mapped_columns['Page']].strip()
                impressions = int(parse_french_number(row.get(mapped_columns['Impressions'], 0)))
                clicks = int(parse_french_number(row.get(mapped_columns['Clicks'], 0)))
                ctr = parse_french_number(row.get(mapped_columns['CTR'], 0), is_percentage=True)
                position = parse_french_number(row.get(mapped_columns['Position'], 0))
                
                # Remove anchor (#) from URL to get base URL
                base_url = original_url.split('#')[0]
                
                # Consolidate metrics for the base URL
                if base_url in url_consolidation:
                    # Add metrics (impressions and clicks)
                    url_consolidation[base_url]['impressions'] += impressions
                    url_consolidation[base_url]['clicks'] += clicks
                    
                    # Weighted average for CTR and position
                    total_impressions = url_consolidation[base_url]['impressions']
                    if total_impressions > 0:
                        # Weight by impressions for more accurate averages
                        old_weight = url_consolidation[base_url]['impressions'] - impressions
                        new_weight = impressions
                        
                        if old_weight + new_weight > 0:
                            url_consolidation[base_url]['ctr'] = (
                                (url_consolidation[base_url]['ctr'] * old_weight + ctr * new_weight) / 
                                (old_weight + new_weight)
                            )
                            url_consolidation[base_url]['position'] = (
                                (url_consolidation[base_url]['position'] * old_weight + position * new_weight) / 
                                (old_weight + new_weight)
                            )
                else:
                    # First occurrence of this base URL
                    url_consolidation[base_url] = {
                        'impressions': impressions,
                        'clicks': clicks,
                        'ctr': ctr,
                        'position': position
                    }
                
            except (ValueError, TypeError) as e:
                print(f"Warning: Skipping invalid row {row}: {e}")
                print(f"Raw values: Impressions='{row.get(mapped_columns.get('Impressions', ''), 'N/A')}', Clicks='{row.get(mapped_columns.get('Clicks', ''), 'N/A')}', CTR='{row.get(mapped_columns.get('CTR', ''), 'N/A')}', Position='{row.get(mapped_columns.get('Position', ''), 'N/A')}'")
                continue
        
        # Convert consolidated data back to cleaned_rows format
        cleaned_rows = []
        for base_url, metrics in url_consolidation.items():
            cleaned_rows.append({
                'Page': base_url,
                'Impressions': metrics['impressions'],
                'Clicks': metrics['clicks'],
                'CTR': metrics['ctr'],
                'Position': metrics['position']
            })
        
        # Remove any existing GSC data for this project to avoid duplicates
        deleted_count = self.db.query(GSCData)\
            .filter(GSCData.project_id == project_id)\
            .delete()
        self.db.commit()
        print(f"Deleted {deleted_count} existing GSC records for project {project_id}")
        
        import_date = datetime.utcnow()
        
        # Get all pages for URL matching
        existing_pages = self.db.query(Page).filter(Page.project_id == project_id).all()
        url_to_page_id = {page.url: page.id for page in existing_pages}
        
        # Prepare import statistics
        imported_rows = 0
        matched_pages = 0
        unmatched_urls = []
        
        # Process each row
        gsc_records = []
        for row in cleaned_rows:
            url = row['Page']
            
            # Try to match with existing page
            page_id = url_to_page_id.get(url)
            if page_id:
                matched_pages += 1
            else:
                unmatched_urls.append(url)
            
            # Create GSC record
            gsc_record = GSCData(
                project_id=project_id,
                page_id=page_id,  # Can be None if no match
                url=url,
                impressions=row['Impressions'],
                clicks=row['Clicks'],
                ctr=row['CTR'],
                position=row['Position'],
                import_date=import_date,
                period_start=period_start_dt,
                period_end=period_end_dt
            )
            gsc_records.append(gsc_record)
            imported_rows += 1
        
        # Bulk insert
        if gsc_records:
            self.db.add_all(gsc_records)
            self.db.commit()
        
        # Calculate consolidation statistics
        original_rows_count = len(rows)  # Original CSV rows
        consolidated_urls_count = len(cleaned_rows)  # After consolidation
        urls_consolidated = original_rows_count - consolidated_urls_count
        
        return {
            "imported_rows": imported_rows,
            "matched_pages": matched_pages,
            "unmatched_urls": unmatched_urls[:10],  # Limit to first 10 for response
            "total_unmatched": len(unmatched_urls),
            "import_date": import_date.isoformat(),
            "period_start": period_start,
            "period_end": period_end,
            "original_csv_rows": original_rows_count,
            "consolidated_urls": consolidated_urls_count,
            "urls_consolidated_count": urls_consolidated,
            "consolidation_message": f"Consolidated {urls_consolidated} URLs with anchors (#) into {consolidated_urls_count} base URLs" if urls_consolidated > 0 else "No URL consolidation needed"
        }

    async def get_by_project(self, project_id: int) -> List[GSCData]:
        """Get all GSC data for a project, ordered by clicks desc"""
        return self.db.query(GSCData)\
            .filter(GSCData.project_id == project_id)\
            .order_by(GSCData.clicks.desc())\
            .all()

    async def get_latest_by_project(self, project_id: int) -> List[GSCData]:
        """Get latest GSC import data for a project"""
        # Find the most recent import date
        latest_import = self.db.query(func.max(GSCData.import_date))\
            .filter(GSCData.project_id == project_id)\
            .scalar()
        
        if not latest_import:
            return []
        
        return self.db.query(GSCData)\
            .filter(and_(
                GSCData.project_id == project_id,
                GSCData.import_date == latest_import
            ))\
            .order_by(GSCData.clicks.desc())\
            .all()

    async def get_gsc_pagerank_analysis(self, project_id: int) -> Dict[str, Any]:
        """Get combined GSC + PageRank analysis for insights"""
        
        # Query joined GSC data with pages (PageRank)
        results = self.db.query(GSCData, Page)\
            .outerjoin(Page, GSCData.page_id == Page.id)\
            .filter(GSCData.project_id == project_id)\
            .all()
        
        if not results:
            return {"message": "No GSC data available"}
        
        # Analyze patterns
        high_traffic_low_pr = []  # High GSC traffic but low PageRank
        high_pr_no_traffic = []   # High PageRank but no GSC traffic
        balanced_pages = []       # Good PageRank and traffic
        orphan_gsc = []          # GSC data but no matching page
        
        total_impressions = 0
        total_clicks = 0
        
        for gsc_data, page in results:
            total_impressions += gsc_data.impressions
            total_clicks += gsc_data.clicks
            
            if not page:  # No matching page (orphan)
                orphan_gsc.append({
                    "url": gsc_data.url,
                    "impressions": gsc_data.impressions,
                    "clicks": gsc_data.clicks,
                    "position": gsc_data.position
                })
                continue
            
            # Categorize based on PageRank and traffic
            pagerank = page.current_pagerank
            traffic_score = gsc_data.impressions + (gsc_data.clicks * 10)  # Weight clicks more
            
            data_point = {
                "url": gsc_data.url,
                "pagerank": pagerank,
                "impressions": gsc_data.impressions,
                "clicks": gsc_data.clicks,
                "position": gsc_data.position,
                "traffic_score": traffic_score
            }
            
            # Define thresholds (could be made configurable)
            high_traffic_threshold = 1000  # impressions + weighted clicks
            high_pagerank_threshold = 0.001  # Adjust based on your data
            
            if traffic_score > high_traffic_threshold and pagerank < high_pagerank_threshold:
                high_traffic_low_pr.append(data_point)
            elif pagerank > high_pagerank_threshold and traffic_score < 100:
                high_pr_no_traffic.append(data_point)
            elif pagerank > high_pagerank_threshold and traffic_score > high_traffic_threshold:
                balanced_pages.append(data_point)
        
        return {
            "total_urls": len(results),
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "insights": {
                "high_traffic_low_pagerank": {
                    "count": len(high_traffic_low_pr),
                    "top_10": sorted(high_traffic_low_pr, key=lambda x: x['traffic_score'], reverse=True)[:10]
                },
                "high_pagerank_no_traffic": {
                    "count": len(high_pr_no_traffic),
                    "top_10": sorted(high_pr_no_traffic, key=lambda x: x['pagerank'], reverse=True)[:10]
                },
                "balanced_pages": {
                    "count": len(balanced_pages),
                    "top_10": sorted(balanced_pages, key=lambda x: x['traffic_score'], reverse=True)[:10]
                },
                "orphan_gsc": {
                    "count": len(orphan_gsc),
                    "top_10": sorted(orphan_gsc, key=lambda x: x['impressions'], reverse=True)[:10]
                }
            }
        }

    async def delete_by_project(self, project_id: int) -> int:
        """Delete all GSC data for a project"""
        deleted = self.db.query(GSCData)\
            .filter(GSCData.project_id == project_id)\
            .delete()
        self.db.commit()
        return deleted

    async def remove_duplicates(self, project_id: int) -> Dict[str, Any]:
        """Remove duplicate GSC entries, keeping the most recent import for each URL"""
        
        # Find all URLs with duplicates
        from sqlalchemy import and_
        
        duplicates = self.db.query(GSCData.url, func.count(GSCData.id).label('count'))\
            .filter(GSCData.project_id == project_id)\
            .group_by(GSCData.url)\
            .having(func.count(GSCData.id) > 1)\
            .all()
        
        if not duplicates:
            return {"message": "No duplicates found", "removed": 0}
        
        removed_count = 0
        
        for url, count in duplicates:
            # Get all records for this URL, ordered by import_date desc
            records = self.db.query(GSCData)\
                .filter(and_(
                    GSCData.project_id == project_id,
                    GSCData.url == url
                ))\
                .order_by(GSCData.import_date.desc())\
                .all()
            
            # Keep the first (most recent) and delete the rest
            if len(records) > 1:
                to_delete = records[1:]  # Skip the first (most recent)
                for record in to_delete:
                    self.db.delete(record)
                    removed_count += 1
        
        self.db.commit()
        
        return {
            "message": f"Removed {removed_count} duplicate records",
            "removed": removed_count,
            "duplicate_urls": len(duplicates)
        }

    async def get_performance_summary(self, project_id: int) -> Dict[str, Any]:
        """Get performance summary combining GSC and PageRank data"""
        
        # Get basic stats
        gsc_data = await self.get_latest_by_project(project_id)
        
        if not gsc_data:
            return {"error": "No GSC data available"}
        
        # Calculate aggregated metrics
        total_impressions = sum(item.impressions for item in gsc_data)
        total_clicks = sum(item.clicks for item in gsc_data)
        avg_position = sum(item.position for item in gsc_data) / len(gsc_data)
        avg_ctr = sum(item.ctr for item in gsc_data) / len(gsc_data)
        
        return {
            "total_urls": len(gsc_data),
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "average_position": round(avg_position, 2),
            "average_ctr": round(avg_ctr, 2),
            "top_traffic_pages": [
                {
                    "url": item.url,
                    "impressions": item.impressions,
                    "clicks": item.clicks,
                    "position": item.position
                }
                for item in sorted(gsc_data, key=lambda x: x.clicks, reverse=True)[:10]
            ]
        }