<?php

namespace App\Services;

use App\Models\AdCreative;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class AdsService
{
    /**
     * Per-placement caps (tweak as you like).
     * If a placement key is missing here, DEFAULT_MAX will be used.
     */
    protected const MAX_PER_PLACEMENT = [
        'hero'    => 1,
        'grid'    => 6,
        'sticky'  => 1,
        'inline'  => 3,
        'generic' => 5,
    ];

    protected const DEFAULT_MAX = 5;

    /** Return ads keyed by placement (no caching, no campaign/device/locale logic) */
    public static function forRequest(Request $request): array
    {
        $now = Carbon::now();

        // Pull active & in-window creatives once, group by placement
        $byPlacement = AdCreative::query()
            ->where('status', 'active')
            ->where(function ($q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            })
            ->orderByDesc('weight') // rough pre-sort; final pick is weighted
            ->get()
            ->groupBy('placement');

        $result = [];

        foreach ($byPlacement as $placementKey => $creatives) {
            $maxItems = self::MAX_PER_PLACEMENT[$placementKey] ?? self::DEFAULT_MAX;

            // Frequency capping per placement via cookie
            $seen = self::seenFromCookie($request, $placementKey);

            // Weighted pick up to maxItems, preferring not-seen
            $picked = [];
            $pool   = $creatives->values()->all();

            while (count($picked) < $maxItems && count($pool)) {
                $idx = self::weightedPick($pool, $seen);
                $picked[] = $pool[$idx];
                array_splice($pool, $idx, 1);
            }

            // Transform for frontend
            $result[$placementKey] = array_map(function ($cr) {
                return [
                    'id'       => $cr->id,
                    'src'      => $cr->image_url, // accessor on model
                    'alt'      => $cr->image_alt ?? ($cr->title ?? 'Ad'),
                    'href' => $cr->target_url
                        ? URL::temporarySignedRoute(
                            'ads.click',
                            now()->addMinutes(15), // link validity window
                            [
                                'creative'  => $cr->id,
                                'to'        => base64_encode($cr->target_url),
                                'placement' => $cr->placement, // optional; helps reporting
                            ]
                        )
                        : null,
                    'title'    => $cr->title,
                    'subtitle' => $cr->subtitle,
                ];
            }, $picked);
        }

        // Ensure all known placements exist in the result, even if empty
        foreach (array_keys(self::MAX_PER_PLACEMENT) as $key) {
            $result[$key] = $result[$key] ?? [];
        }

        return $result;
    }

    /** Recently seen creative IDs from a cookie set by frontend (per placement) */
    protected static function seenFromCookie(Request $r, string $placementKey): array
    {
        $json = $r->cookie("ads_seen_{$placementKey}");
        $arr  = @json_decode($json ?? '[]', true);
        return is_array($arr) ? $arr : [];
    }

    /** Pick an index by weight, preferring not-seen items first */
    protected static function weightedPick(array $pool, array $seen): int
    {
        $fresh = array_values(array_filter($pool, fn($cr) => !in_array($cr->id, $seen, true)));
        $list  = count($fresh) ? $fresh : $pool;

        $total = array_reduce($list, fn($a, $cr) => $a + max(1, (int) $cr->weight), 0);
        $roll  = random_int(1, max(1, $total));
        $acc   = 0;

        foreach ($list as $i => $cr) {
            $acc += max(1, (int) $cr->weight);
            if ($roll <= $acc) {
                // return index relative to original pool
                $id = $cr->id;
                foreach ($pool as $k => $v) {
                    if ($v->id === $id) return $k;
                }
            }
        }
        return 0;
    }
}
