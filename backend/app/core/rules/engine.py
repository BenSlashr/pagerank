from typing import List, Tuple, Any, Dict
from app.core.rules.base import BaseRule, RuleConfig
from app.core.rules.registry import RuleRegistry

class RuleEngine:
    """Engine for applying linking rules to generate new links"""
    
    def __init__(self):
        # Import templates to register them
        import app.core.rules.templates
    
    def create_rule(self, rule_name: str, config_data: Dict) -> BaseRule:
        """Create a rule instance from name and configuration"""
        config = RuleConfig(**config_data)
        return RuleRegistry.get_rule(rule_name, config)
    
    def apply_rule(self, 
                  rule: BaseRule,
                  pages: List[Any], 
                  existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Apply a rule to generate new links"""
        return rule.generate_links(pages, existing_links)
    
    def get_available_rules(self) -> List[Dict]:
        """Get list of all available rules with their information"""
        rules_info = []
        for rule_name in RuleRegistry.list_rules():
            try:
                rule_info = RuleRegistry.get_rule_info(rule_name)
                rules_info.append(rule_info)
            except Exception as e:
                # Skip rules that can't be instantiated
                continue
        return rules_info
    
    def validate_rule_config(self, rule_name: str, config_data: Dict) -> bool:
        """Validate that a rule configuration is valid"""
        try:
            self.create_rule(rule_name, config_data)
            return True
        except Exception:
            return False