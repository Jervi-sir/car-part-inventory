<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\TelegramLink;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Telegram\Bot\Api;
use Telegram\Bot\Laravel\Facades\Telegram;

class TelegramController extends Controller
{
    protected function token()
    {
        return config('services.telegram.bot_token');
    }
    protected function api($m)
    {
        return "https://api.telegram.org/bot{$this->token()}/{$m}";
    }

    // A) User clicks "Connect" → we give them a deep link
    public function connect(Request $r)
    {
        $state = Str::random(32);
        $link = TelegramLink::updateOrCreate(
            ['user_id' => $r->user()->id],
            ['state' => $state]
        );
        $bot = config('services.telegram.bot_username');
        return response()->json([
            'link' => "https://t.me/{$bot}?start={$link->state}",
            'alreadyLinked' => (bool)$link->chat_id,
        ]);
    }

    // B) Telegram sends messages/commands here
    public function webhook(Request $r)
    {
        try {
            $update = $r->json()->all();
            if (!isset($update['message'])) {
                return response('no message', 200);
            }

            $message = $update['message'];
            $chatId  = $message['chat']['id'];
            $text    = $message['text'] ?? '';

            if (str_starts_with($text, '/start')) {
                $parts = explode(' ', $text);

                if (isset($parts[1])) {
                    $state = $parts[1];

                    $link = TelegramLink::where('state', $state)->first();
                    if (!$link) {
                        Log::warning('No link found for state', ['state' => $state]);
                    } else {
                        $link->chat_id          = $chatId;
                        $link->telegram_user_id = $message['from']['id'] ?? null;
                        $link->username         = $message['from']['username'] ?? null;
                        $link->first_name       = $message['from']['first_name'] ?? null;
                        $link->last_name        = $message['from']['last_name'] ?? null;
                        $link->linked_at        = now();
                        $link->save();

                        Http::post("https://api.telegram.org/bot" . env('TELEGRAM_BOT_TOKEN') . "/sendMessage", [
                            'chat_id' => $chatId,
                            'text'    => "✅ Connected! You’ll now receive notifications."
                        ]);
                    }
                }
            }

            return response('ok', 200);
        } catch (\Throwable $e) {
            return response('error', 500);
        }
    }

    public function status(Request $r)
    {
        $link = TelegramLink::where('user_id', $r->user()->id)->first();

        return response()->json([
            'linked' => (bool)($link?->chat_id),
            'link'   => $link?->chat_id ? null : ($link?->state ? "https://t.me/".config('services.telegram.bot_username')."?start=".$link->state : null),
        ]);
    }

    public function disconnect(Request $r)
    {
        $link = TelegramLink::where('user_id', $r->user()->id)->first();
        if ($link) {
            $link->chat_id = null;
            $link->telegram_user_id = null;
            $link->linked_at = null;
            $link->save();
        }
        return response()->json(['ok' => true]);
    }

}



/*
|--------------------------------------------------------------------------
| How to set the webhook
php artisan tinker

use Telegram\Bot\Laravel\Facades\Telegram;

Telegram::setWebhook([
    'url' => url('/api/telegram/webhook'),
]);
|--------------------------------------------------------------------------
*/