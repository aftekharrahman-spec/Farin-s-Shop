<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['id', 'is_enabled', 'pixel_id', 'website_url', 'access_token', 'conversions_api_enabled', 'test_event_code'])]
class MetaTrackingSetting extends Model
{
    public const SINGLETON_ID = 1;

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'access_token' => 'encrypted',
            'conversions_api_enabled' => 'boolean',
        ];
    }

    public function canSendConversions(): bool
    {
        return $this->is_enabled
            && $this->conversions_api_enabled
            && preg_match('/^\d{5,30}$/', (string) $this->pixel_id) === 1
            && filled($this->access_token);
    }
}
