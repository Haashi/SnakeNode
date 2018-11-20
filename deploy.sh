cd /opt/SnakeNode

echo "Pulling from Master" 

#git pull origin master

echo "Pulled successfully from master"

echo "Restarting server..."

pm2 restart SnakeNode

echo "Server restarted Successfully"
