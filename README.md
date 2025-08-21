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


