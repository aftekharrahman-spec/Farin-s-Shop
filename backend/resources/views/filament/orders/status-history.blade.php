<ol class="space-y-4">
    @forelse ($events as $event)
        <li class="border-s-2 border-primary-500 ps-4">
            <p class="font-medium">
                {{ str_replace('_', ' ', ucfirst($event->from_status)) }}
                <span aria-hidden="true">→</span>
                {{ str_replace('_', ' ', ucfirst($event->to_status)) }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $event->actor?->name ?? 'System' }}
                · {{ $event->created_at->timezone('Asia/Dhaka')->format('d M Y, h:i A') }}
            </p>
        </li>
    @empty
        <li class="text-sm text-gray-600 dark:text-gray-400">
            No status changes have been recorded yet.
        </li>
    @endforelse
</ol>
