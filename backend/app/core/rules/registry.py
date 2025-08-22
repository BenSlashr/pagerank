from typing import Dict, Type, List
from app.core.rules.base import BaseRule, RuleConfig

class RuleRegistry:
    """Registry for all available linking rules"""
    
    _rules: Dict[str, Type[BaseRule]] = {}
    
    @classmethod
    def register(cls, name: str, rule_class: Type[BaseRule]):
        """Register a new rule class"""
        cls._rules[name] = rule_class
    
    @classmethod
    def get_rule(cls, name: str, config: RuleConfig) -> BaseRule:
        """Get an instance of a registered rule"""
        if name not in cls._rules:
            raise ValueError(f"Rule '{name}' not found in registry")
        
        return cls._rules[name](config)
    
    @classmethod
    def list_rules(cls) -> List[str]:
        """List all registered rule names"""
        return list(cls._rules.keys())
    
    @classmethod
    def get_rule_info(cls, name: str) -> Dict:
        """Get information about a specific rule"""
        if name not in cls._rules:
            raise ValueError(f"Rule '{name}' not found in registry")
        
        rule_class = cls._rules[name]
        
        # Create a dummy config to get description
        dummy_config = RuleConfig(
            source_filter={},
            target_selector="",
            links_count=1
        )
        dummy_instance = rule_class(dummy_config)
        
        return {
            "name": name,
            "class_name": rule_class.__name__,
            "description": dummy_instance.get_description(),
            "module": rule_class.__module__
        }

# Decorator for easy rule registration
def register_rule(name: str):
    """Decorator to register a rule class"""
    def decorator(rule_class: Type[BaseRule]):
        RuleRegistry.register(name, rule_class)
        return rule_class
    return decorator