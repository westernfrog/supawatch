"use client";

import { useParams } from "next/navigation";

export default function TV({ params }) {
  const param = useParams();
  console.log(param);
  return <div>My Post: {params.id}</div>;
}
