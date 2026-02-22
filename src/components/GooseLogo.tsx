"use client";

import React from "react";

export default function GooseLogo({ className }: { className?: string }) {
    return (
        <div className={`relative ${className}`}>
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Main G body / Goose body */}
                <path
                    d="M85 80 C 85 95, 15 95, 15 80 L 15 35 C 15 10, 85 10, 85 25 L 85 35 L 50 35 L 50 45 L 85 45 L 85 80 Z"
                    fill="currentColor"
                />

                {/* Goose neck/head detail integrated into the top left of G */}
                {/* We'll use absolute positioning or just draw over the G path if needed, 
            but the request is for the G to BE the goose head. */}

                {/* Refined G with Goose Head profile on the top left corner */}
                <path
                    d="M90 75 C 90 95, 10 95, 10 75 L 10 35 C 10 15, 30 5, 50 5 L 85 5 L 85 15 L 50 15 C 35 15, 25 25, 25 35 L 25 75 C 25 85, 75 85, 75 75 L 75 55 L 45 55 L 45 45 L 85 45 L 85 75 Z"
                    fill="currentColor"
                />

                {/* The Goose Head Profile on the top left */}
                {/* Beak */}
                <path
                    d="M5 25 L 15 28 L 15 22 Z"
                    fill="#EAB308"
                />
                {/* Eye patch */}
                <ellipse cx="18" cy="23" rx="3" ry="2" fill="white" />
                <circle cx="18" cy="23" r="1" fill="black" />
            </svg>
        </div>
    );
}
