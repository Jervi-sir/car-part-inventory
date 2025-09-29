<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdCreative;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdCreativeApiController extends Controller
{
    public function page() {
        return Inertia::render('admin/ads/creatives-page');
    }

    public function index(Request $r) {
        $q = AdCreative::query()
            ->when($r->search, fn($qq) =>
                $qq->where('title','like',"%{$r->search}%")
                   ->orWhere('subtitle','like',"%{$r->search}%")
            )
            ->when($r->placement, fn($qq,$p)=>$qq->where('placement',$p))
            ->orderBy($r->get('sort','id'), $r->get('dir','desc'));

        $per = min(max((int)$r->get('per_page', 15), 5), 100);
        return response()->json($q->paginate($per));
    }

    public function store(Request $r) {
        $data = $r->validate([
            'placement'   => ['required','string','max:64'],
            'title'       => ['nullable','string','max:160'],
            'subtitle'    => ['nullable','string','max:160'],
            'image'       => ['required','image','max:4096'],
            'image_alt'   => ['nullable','string','max:160'],
            'target_url'  => ['nullable','url'],
            'weight'      => ['required','integer','min:1','max:100'],
            'status'      => ['required', Rule::in(['active','paused'])],
            'starts_at'   => ['nullable','date'],
            'ends_at'     => ['nullable','date','after_or_equal:starts_at'],
        ]);

        $data['image_path'] = $r->file('image')->store('ads','public');
        unset($data['image']);

        return response()->json(AdCreative::create($data), 201);
    }

    public function update(Request $r, $id) {
        $item = AdCreative::findOrFail($id);
        $data = $r->validate([
            'placement'   => ['required','string','max:64'],
            'title'       => ['nullable','string','max:160'],
            'subtitle'    => ['nullable','string','max:160'],
            'image'       => ['nullable','image','max:4096'],
            'image_alt'   => ['nullable','string','max:160'],
            'target_url'  => ['nullable','url'],
            'weight'      => ['required','integer','min:1','max:100'],
            'status'      => ['required', Rule::in(['active','paused'])],
            'starts_at'   => ['nullable','date'],
            'ends_at'     => ['nullable','date','after_or_equal:starts_at'],
        ]);
        if ($r->hasFile('image')) {
            Storage::disk('public')->delete($item->image_path);
            $data['image_path'] = $r->file('image')->store('ads','public');
        }
        $item->update($data);
        return response()->json($item);
    }

    public function destroy($id) {
        $item = AdCreative::findOrFail($id);
        Storage::disk('public')->delete($item->image_path);
        $item->delete();
        return response()->json(['ok'=>true]);
    }
}
