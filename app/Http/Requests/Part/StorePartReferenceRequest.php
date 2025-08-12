<?php

namespace App\Http\Requests\Part;
use Illuminate\Foundation\Http\FormRequest;

class StorePartReferenceRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return [
        'part_reference_type_id' => ['required','exists:part_reference_types,id'],
        'reference_code' => ['required','string','max:120'],
        'source_brand' => ['nullable','string','max:120'],
    ]; }
}