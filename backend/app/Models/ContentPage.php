<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['title', 'slug', 'summary', 'body', 'seo_title', 'seo_description', 'is_published'])]
class ContentPage extends Model
{
    protected function casts(): array
    {
        return ['is_published' => 'boolean'];
    }
}
