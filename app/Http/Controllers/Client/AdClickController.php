<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\AdClick;
use App\Models\AdCreative;
use Illuminate\Http\Request;

class AdClickController extends Controller
{
    public function __invoke(Request $r)
    {
        // Signed middleware already verified signature + expiry
        $r->validate([
            'creative' => ['required','integer','exists:ad_creatives,id'],
            'to'       => ['required','string'], // base64-encoded
            'placement'=> ['nullable','string','max:64'],
        ]);

        $decoded = base64_decode($r->string('to'), true);
        if (!$decoded) {
            abort(404);
        }

        // Allow only http(s) to avoid open-redirect to javascript:, data:, etc.
        if (!preg_match('#^https?://#i', $decoded)) {
            abort(404);
        }

        // Optional: verify creative exists (validated) and is active
        $creative = AdCreative::findOrFail((int)$r->creative);

        // Log click (best-effort; don't block redirect on failure)
        try {
            AdClick::create([
                'creative_id'  => $creative->id,
                'placement'    => $r->string('placement') ?: null,
                'target_url'   => $decoded,
                'referer'      => (string) $r->headers->get('referer'),
                'ip'           => (string) $r->ip(),
                'user_agent'   => (string) $r->userAgent(),
                'utm_source'   => $r->query('utm_source'),
                'utm_medium'   => $r->query('utm_medium'),
                'utm_campaign' => $r->query('utm_campaign'),
                'utm_content'  => $r->query('utm_content'),
                'utm_term'     => $r->query('utm_term'),
            ]);
        } catch (\Throwable $e) {
            // swallow errors; you can report($e) if you want
        }

        return redirect()->away($decoded, 302);
    }

}
