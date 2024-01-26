"use client";

import { useParams } from "next/navigation";

export default function Genre({ params }) {
  const param = useParams();
  console.log(param);
  return <div>My Post: {params.id}</div>;
}
