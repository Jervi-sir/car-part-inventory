<?php

namespace App\Helpers;

use App\Models\TelegramLink;
use App\Models\User;
use Telegram\Bot\Laravel\Facades\Telegram;

class TelegramNotification
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        //
    }


    public static function notifyUser(User $user, string $message): void
    {
        $link = TelegramLink::where('user_id', $user->id)
            ->whereNotNull('chat_id')
            ->first();

        if ($link) {
            Telegram::sendMessage([
                'chat_id' => $link->chat_id,
                'text'    => $message,
                'parse_mode' => 'HTML', // optional, supports Markdown/HTML
            ]);
        }
    }
}



// $res = Http::post("https://api.telegram.org/bot".env('TELEGRAM_BOT_TOKEN')."/sendMessage", [
//     'chat_id' => $link->chat_id,
//     'text'    => $text,
// ])->json();