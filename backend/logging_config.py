import logging
import sys

def setup_logging():
    """Configure logging for the application"""
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    
    # Configure specific loggers
    pagerank_logger = logging.getLogger('app.core.pagerank')
    pagerank_logger.setLevel(logging.INFO)
    
    import_logger = logging.getLogger('app.services.import_service')
    import_logger.setLevel(logging.INFO)