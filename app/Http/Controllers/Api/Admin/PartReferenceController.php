<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\PartReference;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PartReferenceController extends Controller
{
    private array $types = ['OEM','AFTERMARKET','SUPPLIER','EAN_UPC','OTHER'];

    public function index(Part $part)
    {
        return response()->json([
            'data' => $part->references()->orderBy('id')->get()->map(fn($r) => [
                'id' => $r->id,
                'type' => $r->type,
                'code' => $r->code,
                'source_brand' => $r->source_brand,
            ]),
        ]);
    }

    public function upsert(Request $req, Part $part)
    {
        $payload = $req->validate([
            'references'                 => ['required', 'array'],
            'references.*.id'            => ['nullable','integer','exists:part_references,id'],
            'references.*.type'          => ['required', Rule::in($this->types)],
            'references.*.code'          => ['required','string','max:120'],
            'references.*.source_brand'  => ['nullable','string','max:120'],
        ]);

        $incoming = collect($payload['references']);

        // Keep or create/update by id; delete missing
        $keepIds = [];
        foreach ($incoming as $ref) {
            if (!empty($ref['id'])) {
                $model = PartReference::where('part_id', $part->id)->where('id', $ref['id'])->firstOrFail();
                $model->update([
                    'type' => $ref['type'],
                    'code' => $ref['code'],
                    'source_brand' => $ref['source_brand'] ?? null,
                ]);
                $keepIds[] = $model->id;
            } else {
                $model = PartReference::firstOrCreate(
                    ['part_id' => $part->id, 'type' => $ref['type'], 'code' => $ref['code']],
                    ['source_brand' => $ref['source_brand'] ?? null]
                );
                $keepIds[] = $model->id;
            }
        }

        PartReference::where('part_id', $part->id)
            ->whereNotIn('id', $keepIds)
            ->delete();

        return response()->json(['ok' => true, 'kept' => $keepIds]);
    }
}
