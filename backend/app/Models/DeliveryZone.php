<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'area_code', 'delivery_fee', 'free_delivery_threshold', 'is_active'])]
class DeliveryZone extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'delivery_fee' => 'integer',
            'free_delivery_threshold' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
