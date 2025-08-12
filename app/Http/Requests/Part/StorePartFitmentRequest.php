<?php

namespace App\Http\Requests\Part;
use Illuminate\Foundation\Http\FormRequest;

class StorePartFitmentRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return [
        'vehicle_model_id' => ['required','exists:vehicle_models,id'],
        'engine_code' => ['nullable','string','max:64'],
        'notes' => ['nullable','string','max:255'],
    ]; }
}
