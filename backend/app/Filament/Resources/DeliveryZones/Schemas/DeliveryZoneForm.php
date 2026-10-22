<?php

namespace App\Filament\Resources\DeliveryZones\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class DeliveryZoneForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(120),
                TextInput::make('area_code')
                    ->required()
                    ->maxLength(100)
                    ->alphaDash()
                    ->unique(ignoreRecord: true),
                TextInput::make('delivery_fee')
                    ->required()
                    ->numeric()
                    ->integer()
                    ->minValue(0)
                    ->maxValue(5000000)
                    ->default(0),
                TextInput::make('free_delivery_threshold')
                    ->nullable()
                    ->numeric()
                    ->integer()
                    ->minValue(0)
                    ->maxValue(5000000),
                Toggle::make('is_active')
                    ->default(true)
                    ->label('Service available'),
            ]);
    }
}
