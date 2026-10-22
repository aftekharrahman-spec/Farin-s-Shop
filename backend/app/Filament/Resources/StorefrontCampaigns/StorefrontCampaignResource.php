<?php

namespace App\Filament\Resources\StorefrontCampaigns;

use App\Filament\Resources\StorefrontCampaigns\Pages\CreateStorefrontCampaign;
use App\Filament\Resources\StorefrontCampaigns\Pages\EditStorefrontCampaign;
use App\Filament\Resources\StorefrontCampaigns\Pages\ListStorefrontCampaigns;
use App\Filament\Resources\StorefrontCampaigns\Schemas\StorefrontCampaignForm;
use App\Filament\Resources\StorefrontCampaigns\Tables\StorefrontCampaignsTable;
use App\Models\StorefrontCampaign;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class StorefrontCampaignResource extends Resource
{
    protected static ?string $model = StorefrontCampaign::class;

    protected static ?string $navigationLabel = 'Campaigns';

    protected static ?string $modelLabel = 'campaign';

    protected static ?string $pluralModelLabel = 'campaigns';

    protected static ?int $navigationSort = 8;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedMegaphone;

    public static function form(Schema $schema): Schema
    {
        return StorefrontCampaignForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return StorefrontCampaignsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListStorefrontCampaigns::route('/'),
            'create' => CreateStorefrontCampaign::route('/create'),
            'edit' => EditStorefrontCampaign::route('/{record}/edit'),
        ];
    }
}
