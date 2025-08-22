# Import all rule templates to register them
from app.core.rules.templates.same_category import SameCategoryRule
from app.core.rules.templates.cross_sell import CrossSellRule
from app.core.rules.templates.popular_products import PopularProductsRule
from app.core.rules.templates.menu_modification import MenuModificationRule
from app.core.rules.templates.footer_modification import FooterModificationRule

__all__ = [
    "SameCategoryRule", 
    "CrossSellRule", 
    "PopularProductsRule",
    "MenuModificationRule",
    "FooterModificationRule"
]