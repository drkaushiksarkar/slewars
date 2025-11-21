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



So I want a full revamp of the dashboard UI with added elements. Lets go page by page:

Order of Pages --> Overview, ML Forecasting, Climate Impact, Location Analysis, Disease Analysis, Training, Data Gen, Simulation

- Overview Page
  - Disease Breakdown by Category Card
    - In the database there are multiple diseases not just 6 so I want to include all. These diseases can be grouped like vector borne disease, Air-borne Diseases etc.
    - I want to show the main groups of diseases and their percentage (in the current UI)
    - Then add a accordian which further opens up a dialog box and show the more diseases and their percentage share and numbers.
    - This card should be independent of the Disease dropdown but linked with the time and location dropdown
  - Disease Trend Breakdown
    - Link it to the Disease dropdown too
    - Keep it linked to the location and timefilter
    - Add a threshold line like 95th percentile, mean+2sd, Endemic Channel (median + 2*IQR), this line should be a dotted grey line and can be calcualted from the historical data to show the baseline cases and the current colored line should represent the current state
      - This will enable us to see if the disease is crossing the baseline values based on the historical data
      - We can calculate the risk based on this threshold, If a disease is crossing this then we flag as "High Risk District" --> Show it on the High Risk District Card
      - Add another card in the top 4 card series as the National Risk Level which shown the risk as low, medium and high. Low if the 25% of districts are under the risk and etc etc
        - Show the box color green with green outline if the national risk is low, yellow if medium and red if risk is high
    - Add a dropdown to choose from the 95th percentile, mean+2sd, Endemic Channel (median + 2*IQR)
  - Disease Dropdown
    - Add the individual entries of all the diseases that we have identified
  - Geographic Distribution
    - Link it to the disease dropdown 
    - Add a dropdown here as ADM2, ADM3 and show the map as per the required
    - We have the lat and lon of the ADM2 and ADM3 in the data
    - Change the color pallete of the maps to the RdYlGn in the muted pastel color
    - For ADM4 (facility level), we dont have the area instead we have the individual lat lon points so show them as bubble chart, bigger the bubble, higher the cases 
  - General Notes
    - Keep the asthetic of the page same as current
    - Dont add negative space
    - While opening the accordian in the Disease Breakdown by Category page, it should not interfere with the other card sizes and overlap
  
- ML Forecasting
  - Rename the tab to Prediction Risk
  - Add the remaining diseases that we have identified in the overview page
  - Activate/Fix the Refresh & Retrain Button
  - Make the How Forecasting Works ribbbon smaller'
  - 4 Number of cases card at the bottom of the line chart should be in a same row, not to be overflowed to another row
  - Key Contributing factors:
    - factors should only be the climate factors and not any other
  - Risk Summary Card --> Anamoly Detection Card
    - Add a isolation Forest model at the location level and show any anamoly detected
  
- Climate Impact
  - Make the Current Weather and Historical Weather card less in the height
  - Historical Weather Trend
    - add disease trend along with the weather line 
    - Add dropdown for the disease
      - include all the disease we have indentified in the overview page
    - Add a climate lag model - show it as button to turn off/on on card
      - On by default
    - add a shanky diagram
      - Show the climate impact on the disease
        - use any supersimple mode