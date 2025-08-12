<?php

namespace App\Http\Requests\Part;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePartRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array {
        $id = $this->route('part')->id ?? null;
        return [
            'category_id' => ['sometimes','required','exists:categories,id'],
            'manufacturer_id' => ['nullable','exists:manufacturers,id'],
            'sku' => ['nullable','string','max:80', Rule::unique('parts','sku')->ignore($id)->whereNotNull('sku')],
            'name' => ['sometimes','required','string','max:255'],
            'description' => ['nullable','string'],
            'package_qty' => ['sometimes','required','integer','min:1'],
            'min_order_qty' => ['sometimes','required','integer','min:1'],
            'currency' => ['sometimes','required','string','size:3'],
            'base_price' => ['nullable','numeric','min:0'],
            'is_active' => ['boolean'],
        ];
    }
}