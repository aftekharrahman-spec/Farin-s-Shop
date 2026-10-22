<?php

namespace App\Filament\Resources\HomeContents;

use App\Filament\Resources\HomeContents\Pages\EditHomeContent;
use App\Filament\Resources\HomeContents\Pages\ListHomeContents;
use App\Filament\Resources\HomeContents\Schemas\HomeContentForm;
use App\Filament\Resources\HomeContents\Tables\HomeContentsTable;
use App\Models\HomeContent;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class HomeContentResource extends Resource
{
    protected static ?string $model = HomeContent::class;

    protected static ?string $navigationLabel = 'Home content';

    protected static ?string $modelLabel = 'home content';

    protected static ?int $navigationSort = 6;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedMegaphone;

    public static function form(Schema $schema): Schema
    {
        return HomeContentForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return HomeContentsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->whereKey(HomeContent::SINGLETON_ID);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListHomeContents::route('/'),
            'edit' => EditHomeContent::route('/{record}/edit'),
        ];
    }
}
