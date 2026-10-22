<?php

namespace App\Filament\Resources\CustomCakeRequests\Pages;

use App\Filament\Resources\CustomCakeRequests\CustomCakeRequestResource;
use Filament\Resources\Pages\ListRecords;

class ListCustomCakeRequests extends ListRecords
{
    protected static string $resource = CustomCakeRequestResource::class;
}
