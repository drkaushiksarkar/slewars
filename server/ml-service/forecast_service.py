"""
Legacy Forecast Service (Deprecated)
=====================================

This module is kept for backwards compatibility only.
All new code should use unified_forecast_service.py instead.

The unified model provides:
- Better performance (R² > 0.5)
- Single model for all diseases
- Uncertainty quantification
- No per-disease training needed
"""

from unified_forecast_service import UnifiedForecastService
from loguru import logger

logger.warning(
    "forecast_service.py is deprecated. "
    "Please use unified_forecast_service.py instead. "
    "This file will be removed in a future version."
)

# For backwards compatibility, expose the unified service
ForecastService = UnifiedForecastService
