import SchedulerWorker from './scheduler.worker?worker';

export interface ScheduleItem {
  classId: string;
  teacherId: string;
  subjectId: string;
  day: number; // 2 to 7 (Monday to Saturday)
  period: number; // 1 to 10 (1-5 Sáng, 6-10 Chiều)
  roomId?: string; // Optional Room ID/Name assigned to this lesson
}

export const generateTimetable = (
  classes: any[],
  subjects: any[],
  teachers: any[],
  assignments: any[],
  constraints: any[],
  rooms: any[],
  onProgress?: (progress: number, message: string) => void
): Promise<ScheduleItem[]> => {
  return new Promise((resolve, reject) => {
    // Vite Web Worker instantiation
    const worker = new SchedulerWorker();

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'PROGRESS' && onProgress) {
        onProgress(payload.progress, payload.message);
      } else if (type === 'SUCCESS') {
        resolve(payload);
        worker.terminate();
      } else if (type === 'ERROR') {
        reject(new Error(payload));
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      reject(new Error(err.message || 'Lỗi khởi tạo hoặc chạy Web Worker.'));
      worker.terminate();
    };

    // Bắt đầu tiến trình AI
    worker.postMessage({
      type: 'START',
      payload: { classes, subjects, teachers, assignments, constraints, rooms }
    });
  });
};
