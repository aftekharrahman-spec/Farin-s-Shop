<?php

namespace App\Filament\Resources\StorefrontCampaigns\Pages;

use App\Filament\Resources\StorefrontCampaigns\StorefrontCampaignResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditStorefrontCampaign extends EditRecord
{
    protected static string $resource = StorefrontCampaignResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
