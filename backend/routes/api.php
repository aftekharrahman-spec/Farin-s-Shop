<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\CustomCakeRequestController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\MetaTrackingController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/catalog', [CatalogController::class, 'index']);
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/products/{slug}', [CatalogController::class, 'show']);
    Route::get('/content/home', [ContentController::class, 'home']);
    Route::get('/content/campaigns', [ContentController::class, 'campaigns']);
    Route::get('/content/pages', [ContentController::class, 'pages']);
    Route::get('/content/pages/{slug}', [ContentController::class, 'page']);
    Route::get('/tracking/meta', [MetaTrackingController::class, 'show']);
    Route::get('/delivery/zones', [DeliveryController::class, 'zones']);
    Route::post('/delivery/quote', [DeliveryController::class, 'quote'])->middleware('throttle:30,1');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1');
    Route::post('/custom-cake-requests', [CustomCakeRequestController::class, 'store'])->middleware('throttle:5,1');
});
