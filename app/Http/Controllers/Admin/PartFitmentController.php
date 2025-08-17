<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\PartFitment;
use Illuminate\Http\Request;

class PartFitmentController extends Controller
{
    public function index(Part $part)
    {
        $part->load('fitments.vehicleModel.vehicleBrand');

        return response()->json([
            'data' => $part->fitments->map(function ($f) {
                return [
                    'id'               => $f->id,
                    'vehicle_model_id' => $f->vehicle_model_id,
                    'engine_code'      => $f->engine_code,
                    'notes'            => $f->notes,
                ];
            }),
        ]);
    }

    public function upsert(Request $req, Part $part)
    {
        $payload = $req->validate([
            'fitments'                     => ['required','array'],
            'fitments.*.id'                => ['nullable','integer','exists:part_fitments,id'],
            'fitments.*.vehicle_model_id'  => ['required','integer','exists:vehicle_models,id'],
            'fitments.*.engine_code'       => ['nullable','string','max:64'],
            'fitments.*.notes'             => ['nullable','string','max:255'],
        ]);

        $incoming = collect($payload['fitments']);
        $keepIds = [];

        foreach ($incoming as $f) {
            if (!empty($f['id'])) {
                $model = PartFitment::where('part_id', $part->id)->where('id', $f['id'])->firstOrFail();
                $model->update([
                    'vehicle_model_id' => $f['vehicle_model_id'],
                    'engine_code'      => $f['engine_code'] ?? null,
                    'notes'            => $f['notes'] ?? null,
                ]);
                $keepIds[] = $model->id;
            } else {
                $model = PartFitment::firstOrCreate(
                    [
                        'part_id'          => $part->id,
                        'vehicle_model_id' => $f['vehicle_model_id'],
                        'engine_code'      => $f['engine_code'] ?? null,
                    ],
                    [
                        'notes' => $f['notes'] ?? null,
                    ]
                );
                $keepIds[] = $model->id;
            }
        }

        PartFitment::where('part_id', $part->id)
            ->whereNotIn('id', $keepIds)
            ->delete();

        return response()->json(['ok' => true, 'kept' => $keepIds]);
    }
}
