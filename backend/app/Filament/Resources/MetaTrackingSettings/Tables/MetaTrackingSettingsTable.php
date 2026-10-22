<?php

namespace App\Filament\Resources\MetaTrackingSettings\Tables;

use App\Models\MetaTrackingSetting;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class MetaTrackingSettingsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                IconColumn::make('is_enabled')
                    ->label('Pixel')
                    ->boolean(),
                TextColumn::make('pixel_id')
                    ->label('Pixel ID')
                    ->placeholder('Not configured'),
                IconColumn::make('conversions_api_enabled')
                    ->label('Conversions API')
                    ->boolean(),
                TextColumn::make('updated_at')
                    ->dateTime('d M Y, H:i')
                    ->timezone('Asia/Dhaka'),
            ])
            ->modifyQueryUsing(fn ($query) => $query->whereKey(MetaTrackingSetting::SINGLETON_ID))
            ->filters([])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
