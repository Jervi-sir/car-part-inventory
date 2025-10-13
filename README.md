### for telegram
if its local then use ngrok and try to push to the bot the webhook via tinker 

php artisan tinker

```
use Telegram\Bot\Laravel\Facades\Telegram;

Telegram::setWebhook([
    'url' => url('/api/telegram/webhook'),
]);
```

---

### sources
Car brands logo https://www.carlogos.org/

### #########################################
### how to run it 
<!-- server -->
pm2 start --name car-inventory "php artisan serve --host 0.0.0.0 --port 8899"
<!-- php artisan octane:start --port 8899 --host 0.0.0.0 --rpc-port 8899 -->


### #########################################

### export the db
sudo -u postgres pg_dump -p 5433 -d car_inventory -Fc -f /tmp/car_inventory_$(date +%Y%m%d_%H%M%S).dump

mv /tmp/car_inventory_*.dump ~/jervi/

then via vscode just download it 

## in windows

psql -U postgres -h localhost -p 5433 -c "CREATE DATABASE car_inventory;"
  password is usually jervi175

pg_restore -U postgres -h localhost -p 5433 -d car_inventory --no-owner --no-privileges "./car_inventory_20250926_141341.dump"


