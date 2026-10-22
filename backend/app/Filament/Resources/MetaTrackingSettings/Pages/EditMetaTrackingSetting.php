<?php

namespace App\Filament\Resources\MetaTrackingSettings\Pages;

use App\Filament\Resources\MetaTrackingSettings\MetaTrackingSettingResource;
use Filament\Resources\Pages\EditRecord;

class EditMetaTrackingSetting extends EditRecord
{
    protected static string $resource = MetaTrackingSettingResource::class;

    protected function mutateFormDataBeforeFill(array $data): array
    {
        unset($data['access_token']);
        $data['clear_access_token'] = false;

        return $data;
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        if (($data['clear_access_token'] ?? false) === true) {
            $data['access_token'] = null;
        } else {
            unset($data['access_token']);
        }

        unset($data['clear_access_token']);

        return $data;
    }
}
