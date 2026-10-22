<?php

namespace App\Filament\Resources\HomeContents\Tables;

use App\Models\HomeContent;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class HomeContentsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('announcement_text')
                    ->label('Announcement')
                    ->limit(60),
                TextColumn::make('hero_title_line_one')
                    ->label('Hero headline')
                    ->formatStateUsing(fn (string $state, HomeContent $record): string => trim(
                        "{$state} {$record->hero_title_line_two} {$record->hero_title_accent}",
                    )),
                TextColumn::make('updated_at')
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
