<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category' => ['sometimes', 'string', 'max:100'],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $products = Product::query()
            ->with(['category:id,name,slug', 'images:id,product_id,path,alt_text,sort_order'])
            ->where('is_active', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->when($filters['category'] ?? null, fn ($query, $slug) => $query->whereHas(
                'category',
                fn ($category) => $category->where('slug', $slug),
            ))
            ->when($filters['search'] ?? null, function ($query, $search): void {
                $query->where(function ($products) use ($search): void {
                    $products->where('name', 'like', "%{$search}%")
                        ->orWhere('subtitle', 'like', "%{$search}%");
                });
            })
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 24);

        return response()->json([
            'data' => ProductResource::collection($products->getCollection())->resolve($request),
            'links' => [
                'next' => $products->nextPageUrl(),
                'previous' => $products->previousPageUrl(),
            ],
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
                'is_demo' => (bool) config('services.farins.demo_catalog'),
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data' => CategoryResource::collection(Category::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'slug']))->resolve(request()),
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::query()
            ->with(['category:id,name,slug', 'images:id,product_id,path,alt_text,sort_order'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->firstOrFail();

        return response()->json([
            'data' => (new ProductResource($product))->resolve(request()),
            'meta' => ['is_demo' => (bool) config('services.farins.demo_catalog')],
        ]);
    }
}
