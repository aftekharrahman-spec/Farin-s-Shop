<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

#[Fillable(['customer_name', 'customer_phone', 'details', 'status'])]
class CustomCakeRequest extends Model
{
    use HasFactory;

    private const STATUS_TRANSITIONS = [
        'pending_review' => ['in_progress', 'declined'],
        'in_progress' => ['completed', 'declined'],
        'completed' => [],
        'declined' => [],
    ];

    /**
     * @return array<string, string>
     */
    public function allowedNextStatuses(): array
    {
        return collect(self::STATUS_TRANSITIONS[$this->status] ?? [])
            ->mapWithKeys(fn (string $status): array => [$status => str_replace('_', ' ', ucfirst($status))])
            ->all();
    }

    public function transitionStatus(string $status): void
    {
        if (! in_array($status, self::STATUS_TRANSITIONS[$this->status] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => ['This custom cake request status transition is not allowed.'],
            ]);
        }

        $this->update(['status' => $status]);
    }
}
