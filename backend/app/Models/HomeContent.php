<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'id',
    'announcement_text',
    'announcement_enabled',
    'announcement_side_text',
    'hero_eyebrow',
    'hero_title_line_one',
    'hero_title_line_two',
    'hero_title_accent',
    'hero_description',
    'hero_note',
])]
class HomeContent extends Model
{
    public const SINGLETON_ID = 1;

    protected function casts(): array
    {
        return ['announcement_enabled' => 'boolean'];
    }
}
