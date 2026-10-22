<?php

namespace App\Filament\Resources\StorefrontCampaigns\Tables;

use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class StorefrontCampaignsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('image_path')
                    ->label('Image')
                    ->disk('public')
                    ->square(),
                TextColumn::make('title')
                    ->searchable()
                    ->sortable(),
                IconColumn::make('is_active')
                    ->label('Published')
                    ->boolean(),
                TextColumn::make('starts_at')
                    ->dateTime('d M Y, H:i')
                    ->timezone('Asia/Dhaka')
                    ->sortable(),
                TextColumn::make('ends_at')
                    ->dateTime('d M Y, H:i')
                    ->timezone('Asia/Dhaka')
                    ->sortable(),
            ])
            ->filters([])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
