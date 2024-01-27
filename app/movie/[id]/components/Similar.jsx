"use client";

import Link from "next/link";
import { Fragment, useRef, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlayIcon, RectangleGroupIcon } from "@heroicons/react/24/solid";
import { useParams } from "next/navigation";

export default function Similar(params) {
  const { id } = useParams();
  const [similar, setSimilar] = useState(null);
  useEffect(() => {
    async function fetchSimilar() {
      try {
        const response = await fetch(`/api/getSimilar?id=${id}`);
        const fetchedSimilar = await response.json();
        setSimilar(fetchedSimilar);
      } catch (error) {
        console.error("Error fetching trailers:", error);
      }
    }
    fetchSimilar();
  }, []);

  console.log(similar);
  return <></>;
}
