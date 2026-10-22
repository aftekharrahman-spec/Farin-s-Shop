<?php

namespace App\Filament\Resources\DeliveryZones\Tables;

use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class DeliveryZonesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable(),
                TextColumn::make('area_code')
                    ->searchable(),
                TextColumn::make('delivery_fee')
                    ->formatStateUsing(fn (int $state): string => '৳'.number_format($state))
                    ->sortable(),
                TextColumn::make('free_delivery_threshold')
                    ->formatStateUsing(fn (?int $state): string => $state === null ? '—' : '৳'.number_format($state))
                    ->sortable(),
                IconColumn::make('is_active')
                    ->boolean(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
