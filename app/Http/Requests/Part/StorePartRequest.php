<?php

namespace App\Http\Requests\Part;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePartRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'category_id' => ['required','exists:categories,id'],
            'manufacturer_id' => ['nullable','exists:manufacturers,id'],
            'sku' => ['nullable','string','max:80', Rule::unique('parts','sku')->whereNotNull('sku')],
            'name' => ['required','string','max:255'],
            'description' => ['nullable','string'],
            'package_qty' => ['required','integer','min:1'],
            'min_order_qty' => ['required','integer','min:1'],
            'currency' => ['required','string','size:3'],
            'base_price' => ['nullable','numeric','min:0'],
            'is_active' => ['boolean'],
        ];
    }
}
