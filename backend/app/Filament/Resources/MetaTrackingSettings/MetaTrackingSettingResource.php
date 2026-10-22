<?php

namespace App\Filament\Resources\MetaTrackingSettings;

use App\Filament\Resources\MetaTrackingSettings\Pages\EditMetaTrackingSetting;
use App\Filament\Resources\MetaTrackingSettings\Pages\ListMetaTrackingSettings;
use App\Filament\Resources\MetaTrackingSettings\Schemas\MetaTrackingSettingForm;
use App\Filament\Resources\MetaTrackingSettings\Tables\MetaTrackingSettingsTable;
use App\Models\MetaTrackingSetting;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class MetaTrackingSettingResource extends Resource
{
    protected static ?string $model = MetaTrackingSetting::class;

    protected static ?string $navigationLabel = 'Facebook / Meta Pixel';

    protected static ?string $modelLabel = 'tracking configuration';

    protected static ?int $navigationSort = 9;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChartBar;

    public static function form(Schema $schema): Schema
    {
        return MetaTrackingSettingForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return MetaTrackingSettingsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->whereKey(MetaTrackingSetting::SINGLETON_ID);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListMetaTrackingSettings::route('/'),
            'edit' => EditMetaTrackingSetting::route('/{record}/edit'),
        ];
    }
}
