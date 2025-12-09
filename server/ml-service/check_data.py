"""Check actual data availability without date limits"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from database import fetch_disease_timeseries, fetch_climate_data
from loguru import logger

logger.remove()
logger.add(sys.stdout, level="INFO")

# Test for Bo district (O6uvpzGd5pu)
location_uid = 'O6uvpzGd5pu'
location_name = 'Bo'

diseases = ['Measles', 'Yellow Fever', 'Malaria', 'Cholera']

print("=" * 80)
print(f"DATA AVAILABILITY CHECK - {location_name} ({location_uid})")
print("=" * 80)

for disease in diseases:
    print(f"\n{disease}:")
    print("-" * 80)

    # Fetch ALL data (no date limits)
    data = fetch_disease_timeseries(disease, location_uid, start_date=None, end_date=None)

    if data:
        earliest = data[0]['startdate']
        latest = data[-1]['startdate']
        total_weeks = len(data)

        print(f"  Total weeks: {total_weeks}")
        print(f"  Date range: {earliest} to {latest}")
        print(f"  First 3 weeks:")
        for i, row in enumerate(data[:3]):
            print(f"    {row['startdate']}: {row['cases']} cases from {row['facilities_reporting']} facilities")
        print(f"  Last 3 weeks:")
        for i, row in enumerate(data[-3:]):
            print(f"    {row['startdate']}: {row['cases']} cases from {row['facilities_reporting']} facilities")
    else:
        print(f"  NO DATA")

print("\n" + "=" * 80)
print("CLIMATE DATA:")
print("=" * 80)
climate = fetch_climate_data(location_uid, start_date=None, end_date=None)
if climate:
    print(f"Total climate records: {len(climate)}")
    print(f"Date range: {climate[0]['date']} to {climate[-1]['date']}")
    print(f"Sample record: {climate[0]}")
else:
    print("NO CLIMATE DATA")
