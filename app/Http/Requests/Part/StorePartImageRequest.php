<?php

namespace App\Http\Requests\Part;

use Illuminate\Foundation\Http\FormRequest;

class StorePartImageRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return [ 'url' => ['required','url'] ]; }
}