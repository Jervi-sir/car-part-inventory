<?php

namespace App\Http\Resources;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PartResource extends JsonResource
{
    /** @return array<string,mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => $this->whenLoaded('category', fn()=> [ 'id'=>$this->category->id, 'name'=>$this->category->name ]),
            'manufacturer' => $this->whenLoaded('manufacturer', fn()=> [ 'id'=>$this->manufacturer->id, 'name'=>$this->manufacturer->name ]),
            'sku' => $this->sku,
            'name' => $this->name,
            'description' => $this->description,
            'package_qty' => $this->package_qty,
            'min_order_qty' => $this->min_order_qty,
            'currency' => $this->currency,
            'base_price' => $this->base_price,
            'is_active' => (bool) $this->is_active,
            'created_at' => optional($this->created_at)->toISOString(),
        ];
    }
}
