<?php

namespace App\Filament\Resources\HomeContents\Schemas;

use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class HomeContentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Toggle::make('announcement_enabled')
                    ->label('Show announcement bar')
                    ->default(true),
                TextInput::make('announcement_text')
                    ->required()
                    ->maxLength(240)
                    ->columnSpanFull(),
                TextInput::make('announcement_side_text')
                    ->maxLength(120)
                    ->columnSpanFull(),
                TextInput::make('hero_eyebrow')
                    ->required()
                    ->maxLength(180)
                    ->columnSpanFull(),
                TextInput::make('hero_title_line_one')
                    ->required()
                    ->maxLength(80),
                TextInput::make('hero_title_line_two')
                    ->required()
                    ->maxLength(80),
                TextInput::make('hero_title_accent')
                    ->required()
                    ->maxLength(100),
                Textarea::make('hero_description')
                    ->required()
                    ->maxLength(2000)
                    ->rows(4)
                    ->columnSpanFull(),
                TextInput::make('hero_note')
                    ->required()
                    ->maxLength(160)
                    ->columnSpanFull(),
            ]);
    }
}
