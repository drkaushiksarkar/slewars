ssh-keygen -t ed25519 -C "your@email.com"  # Press Enter for all prompts
cat ~/.ssh/id_ed25519.pub  # Add to GitHub Settings > SSH Keys
git clone git@github.com:IMACS-Health-Modeling/slewars.git
cd slewars

-- create .env file ---
fill the values of the .env file

without the .env file lightsail-setup.sh is failing

chmod +x lightsail-setup.sh
./lightsail-setup.sh

-- I have to also do this after because there was permission issue --

chmod +x /home/ubuntu
chmod -R 755 ~/slewars/dist
sudo nano /etc/nginx/sites-available/ewars
sudo nginx -t

sudo systemctl reload nginx

Then I have to upgrade the scikit 

cd ~/slewars/server/ml-service
source venv/bin/activate
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ~/slewars


rm -rf ~/.pm2/logs/*
rm -rf ~/.pm2/pids/*
pm2 start npm --name "ewars-backend" -- run server:start
cd ~/slewars/server/ml-service
pm2 start venv/bin/python --name "ewars-ml" -- main.py
cd ~/slewars
pm2 save

echo '{"type":"commonjs"}' > server/package.json
echo '{"type":"commonjs"}' > server/dist/package.json

npm run server:build
pm2 restart all

