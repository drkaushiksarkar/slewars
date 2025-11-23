- Database Setup (First time only)

cd server/migrations
./run_migrations.sh

- Training

cd server/ml-service
rm -rf venv


brew install python@3.12
brew install libomp
virtualenv -p python3.12 venv
source venv/bin/activate
pip install psycopg2-binary xgboost pandas numpy scikit-learn loguru python-dotenv
python3 quick_train.py

- Server UP
npm run dev:full


For reference, here's what I tested with good variability:
  - IDSR Malaria (Bo): 57 → 54 → 53 → 54 ✓
  - IDSR Yellow Fever (Bo): 61 → 51 → 49 → 51 ✓
  - IDSR Plague (Kambia): 35 → 33 → 32 → 31 ✓
  - IDSR Cholera (Kambia): 29 → 31 → 33 → 35 ✓
  - IDSR Measles (Western Area): 48 → 50 → 52 → 51 ✓
  - Diarrhoea (Bo): 2542 → 2212 → 2057 → 2337 ✓
  - Typhoid Fever (Western Area): 579 → 549 → 536 → 494 ✓
  - ARI/Pneumonia (Bo): 8585 → 8636 → 8098 → 8500 ✓