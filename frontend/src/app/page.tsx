import Center from "@/components/home/Center/Center";
import LeftSideBar from "@/components/home/LeftSideBar/LeftSideBar";
import RightSideBar from "@/components/home/RightSideBar/RightSideBar";
import style from "./Home.module.scss";

export default function Homepage() {
  return (
    <div className={style.homeContainer}>
      <Center />
      <RightSideBar />
    </div>
  );
}
