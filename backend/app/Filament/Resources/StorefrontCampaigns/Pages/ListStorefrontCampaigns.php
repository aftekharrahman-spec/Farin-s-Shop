<?php

namespace App\Filament\Resources\StorefrontCampaigns\Pages;

use App\Filament\Resources\StorefrontCampaigns\StorefrontCampaignResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListStorefrontCampaigns extends ListRecords
{
    protected static string $resource = StorefrontCampaignResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
