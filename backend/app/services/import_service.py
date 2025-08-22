import pandas as pd
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse, urljoin
from app.repositories.base import ProjectRepository, PageRepository, LinkRepository
from app.core.config import settings

class ImportService:
    def __init__(self, 
                 project_repo: ProjectRepository,
                 page_repo: PageRepository,
                 link_repo: LinkRepository):
        self.project_repo = project_repo
        self.page_repo = page_repo  
        self.link_repo = link_repo
    
    async def import_screaming_frog_csv(self, 
                                       project_name: str,
                                       file_path: str) -> Dict:
        """Import Screaming Frog CSV data and create project with pages and links"""
        
        print("="*80)
        print("🚀🚀🚀 NOUVEAU CODE D'IMPORT ACTIF - VERSION 2.0! 🚀🚀🚀")
        print("="*80)
        print(f"Importing project: {project_name}")
        print(f"File path: {file_path}")
        print(f"Import service module: {__file__}")
        import datetime
        print(f"Current time: {datetime.datetime.now()}")
        
        # Read CSV file with enhanced separator detection
        try:
            # Read first few lines to analyze separator
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                first_line = f.readline().strip()
                second_line = f.readline().strip() if f.tell() < 1000000 else ""
                
            print(f"First line preview: {first_line[:200]}...")
            print(f"First line semicolons: {first_line.count(';')}")
            print(f"First line commas: {first_line.count(',')}")
            
            # Enhanced separator detection
            semicolon_count = first_line.count(';')
            comma_count = first_line.count(',')
            
            # Use semicolon if significantly more semicolons than commas
            if semicolon_count > 10 and semicolon_count > comma_count * 2:
                separator = ';'
            else:
                separator = ','
                
            print(f"🎯 Detected CSV separator: '{separator}'")
            print(f"   Semicolons: {semicolon_count}, Commas: {comma_count}")
            
            # Read CSV with detected separator
            df = pd.read_csv(file_path, sep=separator, encoding='utf-8-sig')
            print(f"📊 CSV loaded successfully: {len(df)} rows, {len(df.columns)} columns")
            
        except Exception as e:
            raise ValueError(f"Error reading CSV file: {str(e)}")
        
        # Detect language and normalize column names
        df = self._normalize_column_names(df)
        print(f"After normalization: {len(df)} rows, {len(df.columns)} columns")
        
        # Check if this is a links-only file (All Outlinks export)
        if self._is_links_only_file(df):
            return await self._import_links_to_existing_project(project_name, df)
        
        # Validate required columns for pages export - segments is now mandatory
        required_columns = ['address', 'status_code', 'segments']
        if not all(col in df.columns for col in required_columns):
            available_cols = list(df.columns)
            raise ValueError(f"CSV must contain columns: {required_columns}. Available columns: {available_cols}")
        
        # Validate that segments column has values
        empty_segments = df['segments'].isna() | (df['segments'] == '')
        if empty_segments.any():
            empty_count = empty_segments.sum()
            raise ValueError(f"La colonne 'Segments' doit être renseignée pour toutes les pages. {empty_count} pages n'ont pas de segment défini. Veuillez compléter cette colonne avant l'import.")
        
        # Filter to only successful pages (2xx status codes)
        print(f"Before 2xx filter: {len(df)} rows")
        df = df[df['status_code'].astype(str).str.startswith('2')]
        print(f"After 2xx filter: {len(df)} rows")
        
        if len(df) > settings.MAX_PAGES_IMPORT:
            raise ValueError(f"Too many pages ({len(df)}). Maximum allowed: {settings.MAX_PAGES_IMPORT}")
        
        # Extract domain from first URL
        domain = self._extract_domain(df['address'].iloc[0])
        
        # Create project
        project = await self.project_repo.create(project_name, domain)
        
        # Extract and log available page types from segments
        page_types = sorted(df['segments'].unique())
        print(f"Page types found in CSV: {page_types}")
        
        # Process pages
        pages_data = await self._process_pages(df, project.id)
        await self.page_repo.bulk_insert(pages_data)
        
        # Update project with page count and available page types
        await self.project_repo.update_total_pages(project.id, len(pages_data))
        await self.project_repo.update_page_types(project.id, page_types)
        
        # Process links if available
        links_count = 0
        if self._has_link_data(df):
            links_data = await self._process_links(df, project.id)
            if links_data:
                await self.link_repo.bulk_insert(links_data)
                links_count = len(links_data)
        
        # Note: PageRank calculation is now manual via dashboard button to avoid server crashes
        
        return {
            "project_id": project.id,
            "project_name": project_name,
            "domain": domain,
            "pages_imported": len(pages_data),
            "links_imported": links_count
        }
    
    async def import_multi_screaming_frog_csv(self, project_name: str, temp_files: List[Dict]) -> Dict:
        """Import multiple CSV files with automatic type detection"""
        
        print(f"🎯 MULTI-IMPORT: Starting import of {len(temp_files)} files")
        for f in temp_files:
            print(f"   📁 {f['name']} ({f['size']:,} bytes)")
        
        # Step 1: Analyze and classify files
        pages_file = None
        links_files = []
        
        for file_info in temp_files:
            file_type = await self._detect_file_type(file_info['path'], file_info['name'])
            print(f"   🔍 {file_info['name']} detected as: {file_type}")
            
            if file_type == 'pages':
                if pages_file is not None:
                    raise ValueError(f"Multiple pages files detected: {pages_file['name']} and {file_info['name']}. Only one pages file allowed.")
                pages_file = file_info
            elif file_type == 'links':
                links_files.append(file_info)
            else:
                raise ValueError(f"Unknown file type for {file_info['name']}. Expected pages or links file.")
        
        if pages_file is None:
            raise ValueError("No pages file detected. At least one file with page data (Address, Segments columns) is required.")
        
        print(f"   ✅ Classification complete: 1 pages file, {len(links_files)} links files")
        
        # Step 2: Import pages first
        print(f"   📊 Importing pages from {pages_file['name']}...")
        result = await self.import_screaming_frog_csv(project_name, pages_file['path'])
        project_id = result['project_id']
        
        # Step 3: Import links files
        total_links_imported = result['links_imported']
        
        for links_file in links_files:
            print(f"   🔗 Importing links from {links_file['name']}...")
            
            try:
                # Read and process links file
                df_links = self._read_and_normalize_csv(links_file['path'])
                links_result = await self._import_links_to_existing_project_by_id(project_id, df_links)
                added_links = links_result.get('links_imported', 0)
                total_links_imported += added_links
                print(f"      ✅ Added {added_links} links")
                
            except Exception as e:
                print(f"      ❌ Failed to import links from {links_file['name']}: {str(e)}")
                # Continue with other files even if one fails
        
        # Update final result
        result['links_imported'] = total_links_imported
        result['files_processed'] = len(temp_files)
        result['message'] = f"Successfully imported {len(temp_files)} files: {result['pages_imported']} pages, {total_links_imported} links"
        
        print(f"   🎉 Multi-import completed: {result['pages_imported']} pages, {total_links_imported} links")
        
        return result
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"
    
    async def _process_pages(self, df: pd.DataFrame, project_id: int) -> List[Dict]:
        """Process pages from Screaming Frog CSV"""
        pages_data = []
        urls_seen = set()
        duplicates_skipped = 0
        
        print(f"Processing {len(df)} rows from DataFrame...")
        
        for i, (_, row) in enumerate(df.iterrows()):
            url = row['address']
            
            # Skip duplicates within the same CSV
            if url in urls_seen:
                duplicates_skipped += 1
                continue
            urls_seen.add(url)
            
            # Use segments column directly as page type (fully customizable)
            page_type = str(row['segments']).strip()
            
            try:
                category = self._extract_category_enhanced(url, row)
            except ValueError as e:
                # Re-raise with more context about which file caused the issue
                raise ValueError(str(e))
            
            # Merge multiple content columns if available
            merged_content = self._merge_content_columns(row)
            
            # Extract title if available
            title = self._extract_title(row)
            
            page_data = {
                "project_id": project_id,
                "url": url,
                "type": page_type,
                "category": category,
                "current_pagerank": 0.0,
                "extracteur_1": merged_content,
                "title": title
            }
            pages_data.append(page_data)
            
            # Log progress for large datasets
            if (i + 1) % 500 == 0:
                print(f"Processed {i + 1}/{len(df)} rows, {len(pages_data)} unique pages")
        
        print(f"Final processing result: {len(pages_data)} unique pages created, {duplicates_skipped} duplicates skipped")
        return pages_data
    
    def _classify_page_type(self, url: str) -> str:
        """Classify page type based on URL patterns"""
        url_lower = url.lower()
        
        if any(keyword in url_lower for keyword in ['/product/', '/p/', '/item/']):
            return 'product'
        elif any(keyword in url_lower for keyword in ['/category/', '/cat/', '/c/']):
            return 'category'
        elif any(keyword in url_lower for keyword in ['/blog/', '/article/', '/news/']):
            return 'blog'
        else:
            return 'other'
    
    def _extract_category(self, url: str) -> Optional[str]:
        """Extract category from URL path"""
        parsed = urlparse(url)
        path_parts = [part for part in parsed.path.split('/') if part]
        
        if len(path_parts) >= 2:
            return f"/{path_parts[0]}/"
        elif len(path_parts) == 1:
            return f"/{path_parts[0]}/"
        
        return "/"
    
    def _has_link_data(self, df: pd.DataFrame) -> bool:
        """Check if CSV contains link data from 'All Outlinks' export"""
        return 'destination' in df.columns or 'target' in df.columns
    
    async def _process_links(self, df: pd.DataFrame, project_id: int) -> List[Dict]:
        """Process links from Screaming Frog 'All Outlinks' CSV"""
        if 'destination' not in df.columns:
            return []
        
        # Get all pages for URL to ID mapping
        pages = await self.page_repo.get_by_project(project_id)
        url_to_id = {page.url: page.id for page in pages}
        
        # Get existing links to avoid duplicates
        existing_links = await self.link_repo.get_by_project(project_id)
        existing_links_set = {(link.from_page_id, link.to_page_id) for link in existing_links}
        
        links_data = []
        seen_links = set()
        
        for _, row in df.iterrows():
            source_url = row['source'] if 'source' in df.columns else row['address']
            target_url = row['destination']
            
            # Skip external links and self-links
            if not self._is_internal_link(source_url, target_url):
                continue
                
            if source_url == target_url:
                continue
            
            # Get page IDs
            from_page_id = url_to_id.get(source_url)
            to_page_id = url_to_id.get(target_url)
            
            if from_page_id and to_page_id:
                link_key = (from_page_id, to_page_id)
                
                # Skip if link already exists in DB or in current batch
                if link_key not in existing_links_set and link_key not in seen_links:
                    links_data.append({
                        "project_id": project_id,
                        "from_page_id": from_page_id,
                        "to_page_id": to_page_id
                    })
                    seen_links.add(link_key)
        
        return links_data
    
    def _is_internal_link(self, source_url: str, target_url: str) -> bool:
        """Check if target URL is internal to the same domain as source"""
        source_domain = urlparse(source_url).netloc
        target_domain = urlparse(target_url).netloc
        return source_domain == target_domain
    
    def _normalize_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize column names to support both English and French Screaming Frog exports"""
        
        # Create a mapping dictionary for common column names
        column_mapping = {
            # French to English
            'Adresse': 'address',
            'Code HTTP': 'status_code', 
            'Statut': 'status_text',
            'Destination': 'destination',
            'Source': 'source',
            'Type': 'type',
            'Ancrage': 'anchor',
            'Texte Alt': 'alt_text',
            'Suivre': 'follow',
            'Cible': 'target',
            'Title 1': 'title',
            'Meta Description 1': 'meta_description',
            'H1-1': 'h1',
            'Taille (octets)': 'size_bytes',
            'Liens entrants': 'inlinks',
            'Liens sortants': 'outlinks',
            'Type de contenu': 'content_type',
            'Profondeur du dossier': 'folder_depth',
            'Crawl profondeur': 'crawl_depth',
            
            # English to lowercase (including common typos)
            'Address': 'address',
            'Adress': 'address',  # Common typo support
            'Status Code': 'status_code',
            'Status': 'status_text', 
            'Destination': 'destination',
            'Source': 'source',
            'Type': 'type',
            'Anchor': 'anchor',
            'Alt Text': 'alt_text',
            'Follow': 'follow',
            'Target': 'target',
            'Title': 'title',
            'Meta Description': 'meta_description',
            'H1': 'h1',
            'Size (bytes)': 'size_bytes',
            'Inlinks': 'inlinks',
            'Outlinks': 'outlinks',
            'Content Type': 'content_type',
            'Folder Depth': 'folder_depth',
            'Crawl Depth': 'crawl_depth',
            'Segments': 'segments'
        }
        
        # Rename columns using the mapping
        df_renamed = df.rename(columns=column_mapping)
        
        # Convert all column names to lowercase for consistency
        df_renamed.columns = [col.lower().replace(' ', '_') for col in df_renamed.columns]
        
        # Fix common typos in column names after lowercasing
        column_fixes = {
            'adress': 'address',  # Fix common typo
        }
        df_renamed = df_renamed.rename(columns=column_fixes)
        
        return df_renamed
    
    def _classify_page_type_enhanced(self, url: str, row: pd.Series) -> str:
        """Enhanced page type classification using URL, segments, title, and content signals"""
        url_lower = url.lower()
        
        # Check for segments column first (if available)
        if 'segments' in row.index and pd.notna(row['segments']):
            segments = str(row['segments']).lower()
            if 'product' in segments or 'produit' in segments:
                return 'product'
            elif 'category' in segments or 'categorie' in segments:
                return 'category'
            elif 'blog' in segments or 'article' in segments:
                return 'blog'
        
        # Enhanced URL pattern matching for French e-commerce
        if any(keyword in url_lower for keyword in ['/produit/', '/product/', '.html', '/p/']):
            return 'product'
        elif any(keyword in url_lower for keyword in ['/categorie/', '/category/', '/cat/', '/c/']):
            return 'category'
        elif any(keyword in url_lower for keyword in ['/blog/', '/article/', '/actualites/', '/news/']):
            return 'blog'
        
        # Check title and H1 content for classification hints
        title = str(row.get('title', '')).lower() if 'title' in row.index else ''
        h1 = str(row.get('h1', '')).lower() if 'h1' in row.index else ''
        
        # Product indicators in French
        product_indicators = ['cuve', 'pompe', 'réservoir', 'accessoire', 'kit', 'produit']
        category_indicators = ['gamme', 'collection', 'série', 'catégorie']
        
        if any(indicator in title or indicator in h1 for indicator in product_indicators):
            # If it contains specific product terms and has product-like URL structure
            if any(keyword in url_lower for keyword in ['.html', '/']) and len(url.split('/')) > 4:
                return 'product'
        
        if any(indicator in title or indicator in h1 for indicator in category_indicators):
            return 'category'
        
        # Default classification based on URL structure
        return self._classify_page_type(url)
    
    def _extract_category_enhanced(self, url: str, row: pd.Series) -> str:
        """Enhanced category extraction requiring category column in CSV"""
        
        # Priority 1: Check for 'category' column in CSV
        if 'category' in row.index and pd.notna(row['category']):
            category = str(row['category']).strip()
            if category and category != '':
                return category
        
        # Priority 2: Check for 'categorie' column (French variant)
        if 'categorie' in row.index and pd.notna(row['categorie']):
            categorie = str(row['categorie']).strip()
            if categorie and categorie != '':
                return categorie
        
        # No category column found - raise error
        raise ValueError(
            "Aucune colonne 'category' ou 'categorie' trouvée dans le fichier CSV. "
            "Cette colonne est requise pour utiliser les simulations de maillage par catégorie. "
            "Veuillez ajouter une colonne 'category' avec les catégories de vos pages dans votre export Screaming Frog."
        )
    
    def _is_links_only_file(self, df: pd.DataFrame) -> bool:
        """Check if this is a links-only file (All Outlinks export)"""
        # Links files have Source and Destination but no Address with status codes
        has_link_columns = 'source' in df.columns and 'destination' in df.columns
        has_page_columns = 'address' in df.columns and 'status_code' in df.columns
        
        return has_link_columns and not has_page_columns
    
    async def _import_links_to_existing_project(self, project_name: str, df: pd.DataFrame) -> Dict:
        """Import links to existing project or create new project with links"""
        
        if not self._has_link_data(df):
            raise ValueError("File appears to be a links file but doesn't contain required link columns")
        
        # Extract domain from first source URL
        if 'source' not in df.columns or len(df) == 0:
            raise ValueError("Links file must contain source URLs")
        
        domain = self._extract_domain(df['source'].iloc[0])
        
        # Try to find existing project with same domain
        existing_projects = await self.project_repo.get_all()
        target_project = None
        
        for project in existing_projects:
            if project.domain == domain:
                target_project = project
                break
        
        # If no existing project, create a new one with minimal page data from links
        pages_data = []
        if not target_project:
            target_project = await self.project_repo.create(project_name, domain)
            
            # Create pages from unique source and destination URLs
            unique_urls = set()
            for _, row in df.iterrows():
                if pd.notna(row['source']):
                    unique_urls.add(row['source'])
                if pd.notna(row['destination']):
                    unique_urls.add(row['destination'])
            
            # Filter to internal URLs only
            internal_urls = [url for url in unique_urls if self._is_internal_url(url, domain)]
            
            # Create minimal page entries
            for url in internal_urls:
                page_data = {
                    "project_id": target_project.id,
                    "url": url,
                    "type": self._classify_page_type(url),
                    "category": "/",  # Default category for links-only imports
                    "current_pagerank": 0.0
                }
                pages_data.append(page_data)
            
            if pages_data:
                await self.page_repo.bulk_insert(pages_data)
                await self.project_repo.update_total_pages(target_project.id, len(pages_data))
        else:
            # For existing project, check if we need to add missing pages
            existing_pages = await self.page_repo.get_by_project(target_project.id)
            existing_urls = {page.url for page in existing_pages}
            
            unique_urls = set()
            for _, row in df.iterrows():
                if pd.notna(row['source']):
                    unique_urls.add(row['source'])
                if pd.notna(row['destination']):
                    unique_urls.add(row['destination'])
            
            # Filter to internal URLs that don't exist yet
            new_internal_urls = [
                url for url in unique_urls 
                if self._is_internal_url(url, domain) and url not in existing_urls
            ]
            
            # Create missing page entries
            for url in new_internal_urls:
                page_data = {
                    "project_id": target_project.id,
                    "url": url,
                    "type": self._classify_page_type(url),
                    "category": "/",  # Default category for links-only imports
                    "current_pagerank": 0.0
                }
                pages_data.append(page_data)
            
            if pages_data:
                await self.page_repo.bulk_insert(pages_data)
                # Update total pages count
                current_total = len(existing_pages) + len(pages_data)
                await self.project_repo.update_total_pages(target_project.id, current_total)
        
        # Process and import links
        links_data = await self._process_links(df, target_project.id)
        links_count = 0
        
        if links_data:
            await self.link_repo.bulk_insert(links_data)
            links_count = len(links_data)
        
        return {
            "project_id": target_project.id,
            "project_name": target_project.name,
            "domain": domain,
            "pages_imported": len(pages_data),
            "links_imported": links_count,
            "message": f"Links imported to {'existing' if len([p for p in existing_projects if p.domain == domain]) > 0 else 'new'} project. Use the PageRank button to calculate scores."
        }
    
    def _is_internal_url(self, url: str, domain: str) -> bool:
        """Check if URL belongs to the same domain"""
        url_domain = self._extract_domain(url)
        return url_domain == domain
    
    async def _detect_file_type(self, file_path: str, file_name: str) -> str:
        """Detect if file contains pages or links data"""
        
        try:
            # Read first few lines
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                first_line = f.readline().strip()
                sample_lines = [f.readline().strip() for _ in range(3)]
            
            # Detect separator
            semicolon_count = first_line.count(';')
            comma_count = first_line.count(',')
            separator = ';' if semicolon_count > 10 and semicolon_count > comma_count * 2 else ','
            
            # Read a small sample to analyze columns
            df_sample = pd.read_csv(file_path, sep=separator, encoding='utf-8-sig', nrows=10)
            df_sample = self._normalize_column_names(df_sample)
            columns = [col.lower() for col in df_sample.columns]
            
            print(f"      File analysis - Columns: {columns[:5]}...")
            
            # Detection logic
            has_address = any(col in columns for col in ['address', 'adresse', 'adress'])  # Support common typos
            has_segments = 'segments' in columns
            has_status_code = 'status_code' in columns or 'code_http' in columns
            has_source_dest = 'source' in columns and 'destination' in columns
            
            if has_address and has_segments:
                # Pages file with segments (status_code optional for detection)
                return 'pages'
            elif has_source_dest:
                return 'links'
            elif has_address and not has_source_dest:
                # Pages file without segments (will fail later with proper error about missing segments)
                return 'pages'
            else:
                # Unknown format
                return 'unknown'
                
        except Exception as e:
            print(f"      Error detecting file type: {str(e)}")
            return 'unknown'
    
    def _read_and_normalize_csv(self, file_path: str) -> pd.DataFrame:
        """Read and normalize CSV with separator detection"""
        
        # Read first line for separator detection
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            first_line = f.readline().strip()
        
        # Detect separator
        semicolon_count = first_line.count(';')
        comma_count = first_line.count(',')
        separator = ';' if semicolon_count > 10 and semicolon_count > comma_count * 2 else ','
        
        # Read and normalize
        df = pd.read_csv(file_path, sep=separator, encoding='utf-8-sig')
        return self._normalize_column_names(df)
    
    async def _import_links_to_existing_project_by_id(self, project_id: int, df: pd.DataFrame) -> Dict:
        """Import links to existing project by ID"""
        
        if not self._has_link_data(df):
            raise ValueError("DataFrame doesn't contain link data (source/destination columns)")
        
        # Get existing pages for URL mapping
        pages = await self.page_repo.get_by_project(project_id)
        url_to_id = {page.url: page.id for page in pages}
        
        # Process links
        links_data = []
        existing_links = await self.link_repo.get_by_project(project_id)
        existing_links_set = {(link.from_page_id, link.to_page_id) for link in existing_links}
        
        seen_links = set()
        
        for _, row in df.iterrows():
            source_url = row['source'] if 'source' in df.columns else row['address']
            target_url = row['destination']
            
            # Skip external links and self-links
            if not self._is_internal_link(source_url, target_url) or source_url == target_url:
                continue
            
            # Get page IDs
            from_page_id = url_to_id.get(source_url)
            to_page_id = url_to_id.get(target_url)
            
            if from_page_id and to_page_id:
                link_key = (from_page_id, to_page_id)
                
                if link_key not in existing_links_set and link_key not in seen_links:
                    links_data.append({
                        "project_id": project_id,
                        "from_page_id": from_page_id,
                        "to_page_id": to_page_id
                    })
                    seen_links.add(link_key)
        
        # Bulk insert links
        if links_data:
            await self.link_repo.bulk_insert(links_data)
        
        return {
            "project_id": project_id,
            "links_imported": len(links_data)
        }
    
    def _merge_content_columns(self, row: pd.Series) -> Optional[str]:
        """Merge multiple content columns (Content, Content 1, Content 2, etc.) intelligently"""
        
        content_columns = []
        
        # Look for various content column patterns
        potential_columns = [
            'content',
            'content_1', 'content_2', 'content_3', 'content_4', 'content_5',
            'content 1', 'content 2', 'content 3', 'content 4', 'content 5',
            'contenu',
            'contenu_1', 'contenu_2', 'contenu_3', 'contenu_4', 'contenu_5',
            'contenu 1', 'contenu 2', 'contenu 3', 'contenu 4', 'contenu 5'
        ]
        
        # Collect non-empty content from available columns
        for col_name in potential_columns:
            if col_name in row.index and pd.notna(row[col_name]):
                content_value = str(row[col_name]).strip()
                if content_value and content_value.lower() not in ['nan', 'none', '']:
                    content_columns.append(content_value)
        
        if not content_columns:
            return None
        
        # If only one content column, return it directly
        if len(content_columns) == 1:
            return content_columns[0]
        
        # If multiple columns, merge them with proper spacing
        # Remove duplicates while preserving order
        unique_contents = []
        seen_contents = set()
        
        for content in content_columns:
            # Normalize for comparison (remove extra whitespace, case insensitive)
            normalized = ' '.join(content.lower().split())
            if normalized not in seen_contents:
                unique_contents.append(content)
                seen_contents.add(normalized)
        
        # Join with double space to separate different content sections
        merged_content = '  '.join(unique_contents)
        
        # Truncate if too long (optional safety measure)
        max_length = 10000  # Adjust as needed
        if len(merged_content) > max_length:
            merged_content = merged_content[:max_length] + "... [truncated]"
        
        return merged_content
    
    def _extract_title(self, row: pd.Series) -> Optional[str]:
        """Extract page title from available columns"""
        
        # Look for title columns in order of preference
        title_columns = [
            'title',
            'title_1', 'title 1',
            'titre',
            'titre_1', 'titre 1'
        ]
        
        for col_name in title_columns:
            if col_name in row.index and pd.notna(row[col_name]):
                title_value = str(row[col_name]).strip()
                if title_value and title_value.lower() not in ['nan', 'none', '']:
                    return title_value
        
        return None
    
