- Training

cd server/ml-service
rm -rf venv

brew install python@3.12
virtualenv -p python3.12 venv
source venv/bin/activate
pip install psycopg2-binary xgboost pandas numpy scikit-learn loguru python-dotenv
python3 quick_train.py

- Server UP
npm run dev:full